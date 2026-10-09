import { beforeEach,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({requireUser:mocks.user,createAdminClient:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import { reviewActivity } from "@/app/(panel)/activities/actions";
beforeEach(()=>vi.resetAllMocks());
it.each([[{submitted_at:"2026-10-07T23:00:00Z"}],{submitted_at:"2026-10-07T23:00:00Z"}])("confere entregas com as duas formas de relação do Supabase",async submissions=>{
 const query={select(){return query;},eq(){return query;},async maybeSingle(){return {error:null,data:{student_id:"student",students:{slug:"link"},activity_submissions:submissions}};}};
 const mutation={eq(){return mutation;},then(resolve:(value:{error:null})=>unknown){return Promise.resolve({error:null}).then(resolve);}};
 mocks.user.mockResolvedValue({userId:"teacher",supabase:{from:()=>({...query,update:mocks.update.mockReturnValue(mutation)})}});
 expect(await reviewActivity("activity","Arquivo conferido")).toEqual({ok:true,data:undefined});
 expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({feedback:"Arquivo conferido",reviewed_at:expect.any(String)}));
});
